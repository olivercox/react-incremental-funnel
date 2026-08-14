import { useCallback, useRef, useState } from 'react';
import { useIncrementalFunnel } from 'react-incremental-funnel';
import './App.css';

const steps = ['names', 'contact', 'address-consent'];

const initialValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
  acceptTerms: false,
  marketingConsent: false,
  simulateError: false
};

const fieldPolicies = {
  firstName: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  lastName: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  email: { persist: 'session', ttlMs: 30 * 60 * 1000 },
  phone: { persist: 'session', ttlMs: 30 * 60 * 1000 },
  addressLine1: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  addressLine2: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  city: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  region: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  postalCode: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  country: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  acceptTerms: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  marketingConsent: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  simulateError: { persist: 'remoteOnly' }
};

function App() {
  const draftIdRef = useRef(null);
  const [draftMetadata, setDraftMetadata] = useState(null);
  const createSession = useCallback(async () => {
    const response = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Could not create mock draft session');
    }

    const payload = await response.json();
    draftIdRef.current = payload.draftId;
    setDraftMetadata(payload.metadata);
    return payload.metadata;
  }, []);
  const updateRemote = useCallback(async values => {
    if (!draftIdRef.current) {
      return;
    }

    const response = await fetch(`/api/drafts/${draftIdRef.current}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ values })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Remote sync failed' }));
      throw new Error(body.error ?? 'Remote sync failed');
    }

    const payload = await response.json();
    setDraftMetadata(payload.metadata);
  }, []);
  const submitRemote = useCallback(async values => {
    if (!draftIdRef.current) {
      throw new Error('Missing draft session id');
    }

    const response = await fetch(`/api/drafts/${draftIdRef.current}/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ values })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Submit failed' }));
      throw new Error(body.error ?? 'Submit failed');
    }

    const payload = await response.json();
    setDraftMetadata(payload.metadata);
    draftIdRef.current = payload.draftId;
  }, []);

  const funnel = useIncrementalFunnel({
    storageKey: 'api-backed-vite-funnel-demo',
    initialValues,
    steps,
    persistStepState: true,
    includeStepStateInRemoteUpdate: true,
    debounceMs: 1_500,
    fieldPolicies,
    createSession,
    updateRemote,
    submitRemote
  });

  const step = funnel.currentStepId;
  const isAddressConsent = step === 'address-consent';
  const flushRemote = useCallback(() => {
    void funnel.flushRemoteUpdates();
  }, [funnel]);

  const next = () => {
    if (!step) {
      return;
    }
    funnel.markStepComplete(step);
    funnel.nextStep();
    flushRemote();
  };

  const previous = () => {
    if (!step) {
      return;
    }
    funnel.markStepIncomplete(step);
    funnel.previousStep();
    flushRemote();
  };

  const submit = async () => {
    try {
      await funnel.submit();
      draftIdRef.current = null;
    } catch {
      // handled by submitError
    }
  };

  return (
    <main>
      <h1>api-backed-vite example</h1>
      <p>
        This demo uses a local in-memory mock API to show remote session creation,
        debounced draft sync, submit, error handling, and start-again behavior.
      </p>

      {funnel.savedProgressIsStale ? (
        <section className="card notice">
          <strong>We found a saved request on this device.</strong>
          <p>Continue saved request or start again.</p>
          <div className="row">
            <button type="button" onClick={funnel.continueSavedProgress}>
              Continue saved request
            </button>
            <button type="button" onClick={funnel.startAgain}>
              Start again
            </button>
          </div>
        </section>
      ) : null}

      <div className="example-layout">
        <section className="form-column">
          {step === 'names' ? (
            <section className="card">
              <h2>Names</h2>
              <label>
                First name (local)
                <input
                  value={funnel.values.firstName ?? ''}
                  onChange={event => funnel.updateValues({ firstName: event.target.value })}
                  onBlur={flushRemote}
                />
              </label>
              <label>
                Last name (local)
                <input
                  value={funnel.values.lastName ?? ''}
                  onChange={event => funnel.updateValues({ lastName: event.target.value })}
                  onBlur={flushRemote}
                />
              </label>
            </section>
          ) : null}

          {step === 'contact' ? (
            <section className="card">
              <h2>Email and phone</h2>
              <label>
                Email (session)
                <input
                  value={funnel.values.email ?? ''}
                  onChange={event => funnel.updateValues({ email: event.target.value })}
                  onBlur={flushRemote}
                />
              </label>

              <label>
                Phone (session)
                <input
                  value={funnel.values.phone ?? ''}
                  onChange={event => funnel.updateValues({ phone: event.target.value })}
                  onBlur={flushRemote}
                />
              </label>
            </section>
          ) : null}

          {isAddressConsent ? (
            <section className="card">
              <h2>Address, terms and marketing consent</h2>
              <label>
                Address line 1 (local)
                <input
                  value={funnel.values.addressLine1 ?? ''}
                  onChange={event => funnel.updateValues({ addressLine1: event.target.value })}
                  onBlur={flushRemote}
                />
              </label>
              <label>
                Address line 2 (local)
                <input
                  value={funnel.values.addressLine2 ?? ''}
                  onChange={event => funnel.updateValues({ addressLine2: event.target.value })}
                  onBlur={flushRemote}
                />
              </label>
              <label>
                City (local)
                <input
                  value={funnel.values.city ?? ''}
                  onChange={event => funnel.updateValues({ city: event.target.value })}
                  onBlur={flushRemote}
                />
              </label>
              <label>
                State/region (local)
                <input
                  value={funnel.values.region ?? ''}
                  onChange={event => funnel.updateValues({ region: event.target.value })}
                  onBlur={flushRemote}
                />
              </label>
              <label>
                Postal code (local)
                <input
                  value={funnel.values.postalCode ?? ''}
                  onChange={event => funnel.updateValues({ postalCode: event.target.value })}
                  onBlur={flushRemote}
                />
              </label>
              <label>
                Country (local)
                <input
                  value={funnel.values.country ?? ''}
                  onChange={event => funnel.updateValues({ country: event.target.value })}
                  onBlur={flushRemote}
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(funnel.values.acceptTerms)}
                  onChange={event => funnel.updateValues({ acceptTerms: event.target.checked })}
                />
                I accept the terms and conditions
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(funnel.values.marketingConsent)}
                  onChange={event => funnel.updateValues({ marketingConsent: event.target.checked })}
                />
                I consent to marketing updates
              </label>
              <button
                type="button"
                onClick={submit}
                disabled={funnel.submitStatus === 'submitting' || !funnel.values.acceptTerms}
              >
                {funnel.submitStatus === 'submitting' ? 'Submitting…' : 'Submit draft'}
              </button>
            </section>
          ) : null}

          <section className="row">
            <button type="button" onClick={previous} disabled={!funnel.canGoBack}>
              Back
            </button>
            <button type="button" onClick={next} disabled={!funnel.canGoNext}>
              Next
            </button>
            <button type="button" onClick={funnel.startAgain}>
              Start again
            </button>
          </section>

          {funnel.sessionCreationError ? (
            <p className="error">Session error: {String(funnel.sessionCreationError)}</p>
          ) : null}
          {funnel.submitError ? <p className="error">Submit error: {String(funnel.submitError)}</p> : null}
        </section>

        <aside className="sidebar-column">
          <details className="card sidebar-card">
            <summary>Funnel metadata</summary>
            <p>
              Current step: <strong>{step ?? 'none'}</strong>
            </p>
            <p>
              Completed steps:{' '}
              {funnel.completedStepIds.length ? funnel.completedStepIds.join(', ') : 'none'}
            </p>
            <p>
              Saved progress exists: <strong>{String(funnel.savedProgressExists)}</strong>
            </p>
            <pre>{JSON.stringify(funnel.values, null, 2)}</pre>
            <h3>Remote section</h3>
            <p>
              Session creation: <strong>{funnel.sessionCreationStatus}</strong>
            </p>
            <p>
              Remote sync: <strong>{funnel.remoteSyncStatus}</strong>
            </p>
            <p>
              Submit: <strong>{funnel.submitStatus}</strong>
            </p>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={Boolean(funnel.values.simulateError)}
                onChange={event => funnel.updateValues({ simulateError: event.target.checked })}
              />
              Simulate remote update error
            </label>
            <button type="button" onClick={() => void funnel.retryRemoteUpdates()}>
              Retry remote updates
            </button>
            <pre>{JSON.stringify(draftMetadata, null, 2)}</pre>
          </details>
        </aside>
      </div>
    </main>
  );
}

export default App;
