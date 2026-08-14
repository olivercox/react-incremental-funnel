import { useMemo } from 'react';
import { useIncrementalFunnel } from 'react-incremental-funnel';
import './App.css';

const steps = ['start', 'details', 'review'];

const defaultValues = {
  funnelVariant: 'standard',
  selectedServices: [],
  frequency: 'weekly',
  contactEmail: '',
  extraContext: '',
  oneTimeBudget: ''
};

function App() {
  const funnel = useIncrementalFunnel({
    storageKey: 'basic-vite-funnel-demo',
    initialValues: defaultValues,
    steps,
    persistStepState: true,
    fieldPolicies: {
      funnelVariant: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
      selectedServices: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
      frequency: { persist: 'local', ttlMs: 7 * 24 * 60 * 60 * 1000 },
      contactEmail: { persist: 'session', ttlMs: 15 * 60 * 1000 },
      extraContext: { persist: 'memory' },
      oneTimeBudget: { persist: 'memory' }
    },
    submitRemote: async values => {
      await new Promise(resolve => setTimeout(resolve, 350));
      window.console.log('Mock submit payload', values);
    }
  });

  const currentStep = funnel.currentStepId;
  const selectedServices = useMemo(
    () => new Set(funnel.values.selectedServices ?? []),
    [funnel.values.selectedServices]
  );

  const updateService = service => {
    const next = new Set(selectedServices);
    if (next.has(service)) {
      next.delete(service);
    } else {
      next.add(service);
    }

    funnel.updateValues({ selectedServices: [...next] });
  };

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

      <section className="card">
        <p>
          Current step: <strong>{currentStep ?? 'none'}</strong>
        </p>
        <p>
          Completed steps: {funnel.completedStepIds.length ? funnel.completedStepIds.join(', ') : 'none'}
        </p>
        <p>
          Saved progress exists: <strong>{String(funnel.savedProgressExists)}</strong>
        </p>
        <p>
          Submit status: <strong>{funnel.submitStatus}</strong>
        </p>
      </section>

      {currentStep === 'start' ? (
        <section className="card">
          <h2>Start</h2>
          <label>
            Funnel variant (local)
            <select
              value={funnel.values.funnelVariant ?? 'standard'}
              onChange={event => funnel.updateValues({ funnelVariant: event.target.value })}
            >
              <option value="standard">Standard</option>
              <option value="priority">Priority</option>
            </select>
          </label>
        </section>
      ) : null}

      {currentStep === 'details' ? (
        <section className="card">
          <h2>Details</h2>
          <div>
            <p>Selected services (local)</p>
            {['Companionship', 'Transport', 'Meal prep'].map(service => (
              <label key={service} className="checkbox">
                <input
                  type="checkbox"
                  checked={selectedServices.has(service)}
                  onChange={() => updateService(service)}
                />
                {service}
              </label>
            ))}
          </div>

          <label>
            Visit frequency (local)
            <select
              value={funnel.values.frequency ?? 'weekly'}
              onChange={event => funnel.updateValues({ frequency: event.target.value })}
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          <label>
            Contact email (session, 15-minute TTL)
            <input
              value={funnel.values.contactEmail ?? ''}
              onChange={event => funnel.updateValues({ contactEmail: event.target.value })}
            />
          </label>

          <label>
            Additional context (memory only)
            <textarea
              value={funnel.values.extraContext ?? ''}
              onChange={event => funnel.updateValues({ extraContext: event.target.value })}
            />
          </label>

          <label>
            One-time budget note (memory only)
            <input
              value={funnel.values.oneTimeBudget ?? ''}
              onChange={event => funnel.updateValues({ oneTimeBudget: event.target.value })}
            />
          </label>
        </section>
      ) : null}

      {currentStep === 'review' ? (
        <section className="card">
          <h2>Review and submit</h2>
          <pre>{JSON.stringify(funnel.values, null, 2)}</pre>
          <button type="button" onClick={submit} disabled={funnel.submitStatus === 'submitting'}>
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
    </main>
  );
}

export default App;
