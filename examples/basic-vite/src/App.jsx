import { useCallback } from 'react';
import { useIncrementalFunnel } from 'react-incremental-funnel';
import './App.css';

const steps = ['names', 'contact', 'address-consent'];

const defaultValues = {
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
  marketingConsent: false
};

const fieldPolicies = {
  firstName: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  lastName: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  email: { persist: 'session', ttlMs: 15 * 60 * 1000 },
  phone: { persist: 'session', ttlMs: 15 * 60 * 1000 },
  addressLine1: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  addressLine2: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  city: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  region: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  postalCode: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  country: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  acceptTerms: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  marketingConsent: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 }
};

function App() {
  const submitRemote = useCallback(async values => {
    await new Promise(resolve => setTimeout(resolve, 350));
    window.console.log('Mock submit payload', values);
  }, []);

  const funnel = useIncrementalFunnel({
    storageKey: 'basic-vite-funnel-demo',
    initialValues: defaultValues,
    steps,
    persistStepState: true,
    fieldPolicies,
    submitRemote
  });

  const currentStep = funnel.currentStepId;
  const moveNext = () => {
    if (!currentStep) {
      return;
    }
    funnel.markStepComplete(currentStep);
    funnel.nextStep();
  };

  const moveBack = () => {
    if (!currentStep) {
      return;
    }
    funnel.markStepIncomplete(currentStep);
    funnel.previousStep();
  };

  const submit = async () => {
    try {
      await funnel.submit();
    } catch {
      // handled by submitError
    }
  };

  return (
    <main>
      <h1>basic-vite example</h1>
      <p>
        Local-only funnel demo using generic mock fields. This shows step orchestration,
        field-level persistence policies, local/session expiry, resume/start-again, and
        submit lifecycle.
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
          {currentStep === 'names' ? (
            <section className="card">
              <h2>Names</h2>
              <label>
                First name (local)
                <input
                  value={funnel.values.firstName ?? ''}
                  onChange={event => funnel.updateValues({ firstName: event.target.value })}
                />
              </label>
              <label>
                Last name (local)
                <input
                  value={funnel.values.lastName ?? ''}
                  onChange={event => funnel.updateValues({ lastName: event.target.value })}
                />
              </label>
            </section>
          ) : null}

          {currentStep === 'contact' ? (
            <section className="card">
              <h2>Email and phone</h2>
              <label>
                Email (session, 15-minute TTL)
                <input
                  value={funnel.values.email ?? ''}
                  onChange={event => funnel.updateValues({ email: event.target.value })}
                />
              </label>

              <label>
                Phone (session, 15-minute TTL)
                <input
                  value={funnel.values.phone ?? ''}
                  onChange={event => funnel.updateValues({ phone: event.target.value })}
                />
              </label>
            </section>
          ) : null}

          {currentStep === 'address-consent' ? (
            <section className="card">
              <h2>Address, terms and marketing consent</h2>
              <label>
                Address line 1 (local)
                <input
                  value={funnel.values.addressLine1 ?? ''}
                  onChange={event => funnel.updateValues({ addressLine1: event.target.value })}
                />
              </label>
              <label>
                Address line 2 (local)
                <input
                  value={funnel.values.addressLine2 ?? ''}
                  onChange={event => funnel.updateValues({ addressLine2: event.target.value })}
                />
              </label>
              <label>
                City (local)
                <input
                  value={funnel.values.city ?? ''}
                  onChange={event => funnel.updateValues({ city: event.target.value })}
                />
              </label>
              <label>
                State/region (local)
                <input
                  value={funnel.values.region ?? ''}
                  onChange={event => funnel.updateValues({ region: event.target.value })}
                />
              </label>
              <label>
                Postal code (local)
                <input
                  value={funnel.values.postalCode ?? ''}
                  onChange={event => funnel.updateValues({ postalCode: event.target.value })}
                />
              </label>
              <label>
                Country (local)
                <input
                  value={funnel.values.country ?? ''}
                  onChange={event => funnel.updateValues({ country: event.target.value })}
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
                {funnel.submitStatus === 'submitting' ? 'Submitting…' : 'Submit mock request'}
              </button>
            </section>
          ) : null}

          <section className="row">
            <button type="button" onClick={moveBack} disabled={!funnel.canGoBack}>
              Back
            </button>
            <button type="button" onClick={moveNext} disabled={!funnel.canGoNext}>
              Next
            </button>
            <button type="button" onClick={funnel.startAgain}>
              Start again
            </button>
          </section>

          {funnel.submitError ? (
            <p className="error">Submit error: {String(funnel.submitError)}</p>
          ) : null}
        </section>

        <aside className="sidebar-column">
          <details className="card sidebar-card">
            <summary>Example metadata</summary>
            <p>
              Current step: <strong>{currentStep ?? 'none'}</strong>
            </p>
            <p>
              Completed steps:{' '}
              {funnel.completedStepIds.length ? funnel.completedStepIds.join(', ') : 'none'}
            </p>
            <p>
              Saved progress exists: <strong>{String(funnel.savedProgressExists)}</strong>
            </p>
            <p>
              Submit status: <strong>{funnel.submitStatus}</strong>
            </p>
            <pre>{JSON.stringify(funnel.values, null, 2)}</pre>
          </details>
        </aside>
      </div>
    </main>
  );
}

export default App;
