import { useMemo, useRef, useState } from 'react';
import { useIncrementalFunnel } from 'react-incremental-funnel';
import './App.css';

const steps = ['intro', 'details', 'review'];

const initialValues = {
  requestCategory: 'companionship',
  serviceFrequency: 'weekly',
  contactEmail: '',
  temporaryQuestion: '',
  sensitiveNotes: '',
  simulateError: false
};

function App() {
  const draftIdRef = useRef(null);
  const [draftMetadata, setDraftMetadata] = useState(null);

  const funnel = useIncrementalFunnel({
    storageKey: 'api-backed-vite-funnel-demo',
    initialValues,
    steps,
    persistStepState: true,
    includeStepStateInRemoteUpdate: true,
    debounceMs: 500,
    fieldPolicies: {
      requestCategory: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
      serviceFrequency: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
      contactEmail: { persist: 'session', ttlMs: 30 * 60 * 1000 },
      temporaryQuestion: { persist: 'memory' },
      sensitiveNotes: { persist: 'remoteOnly' },
      simulateError: { persist: 'remoteOnly' }
    },
    createSession: async () => {
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
    },
    updateRemote: async values => {
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
    },
    submitRemote: async values => {
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
    }
  });

  const step = funnel.currentStepId;
  const isReview = step === 'review';
  const publicReview = useMemo(
    () => ({
      requestCategory: funnel.values.requestCategory,
      serviceFrequency: funnel.values.serviceFrequency,
      contactEmail: funnel.values.contactEmail,
      temporaryQuestion: funnel.values.temporaryQuestion,
      sensitiveNotes: funnel.values.sensitiveNotes ? '[remoteOnly value hidden in local storage]' : ''
    }),
    [funnel.values]
  );

  const next = () => {
    if (!step) {
      return;
    }
    funnel.markStepComplete(step);
    funnel.nextStep();
  };

  const previous = () => {
    if (!step) {
      return;
    }
    funnel.markStepIncomplete(step);
    funnel.previousStep();
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

      <section className="card">
        <p>
          Session creation: <strong>{funnel.sessionCreationStatus}</strong>
        </p>
        <p>
          Remote sync: <strong>{funnel.remoteSyncStatus}</strong>
        </p>
        <p>
          Submit: <strong>{funnel.submitStatus}</strong>
        </p>
        <p>
          Saved progress exists: <strong>{String(funnel.savedProgressExists)}</strong>
        </p>
        <pre>{JSON.stringify(draftMetadata, null, 2)}</pre>
      </section>

      {step === 'intro' ? (
        <section className="card">
          <h2>Intro</h2>
          <label>
            Request category (local)
            <select
              value={funnel.values.requestCategory ?? 'companionship'}
              onChange={event => funnel.updateValues({ requestCategory: event.target.value })}
            >
              <option value="companionship">Companionship</option>
              <option value="home-help">Home help</option>
              <option value="transport">Transport</option>
            </select>
          </label>
        </section>
      ) : null}

      {step === 'details' ? (
        <section className="card">
          <h2>Details</h2>
          <label>
            Service frequency (local)
            <select
              value={funnel.values.serviceFrequency ?? 'weekly'}
              onChange={event => funnel.updateValues({ serviceFrequency: event.target.value })}
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          <label>
            Contact email (session)
            <input
              value={funnel.values.contactEmail ?? ''}
              onChange={event => funnel.updateValues({ contactEmail: event.target.value })}
            />
          </label>

          <label>
            Temporary question (memory only)
            <input
              value={funnel.values.temporaryQuestion ?? ''}
              onChange={event => funnel.updateValues({ temporaryQuestion: event.target.value })}
            />
          </label>

          <label>
            Sensitive notes (remoteOnly, never in browser storage)
            <textarea
              value={funnel.values.sensitiveNotes ?? ''}
              onChange={event => funnel.updateValues({ sensitiveNotes: event.target.value })}
            />
          </label>

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
        </section>
      ) : null}

      {isReview ? (
        <section className="card">
          <h2>Review and submit</h2>
          <pre>{JSON.stringify(publicReview, null, 2)}</pre>
          <button type="button" onClick={submit} disabled={funnel.submitStatus === 'submitting'}>
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
    </main>
  );
}

export default App;
