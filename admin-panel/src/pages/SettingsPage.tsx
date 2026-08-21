import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import {
  fetchSettings,
  updateSettings,
  type CustomPostField,
  type UpdateAppSettingsInput,
} from '../api/admin';
import { errorMessage } from '../api/client';

function emptyField(): CustomPostField {
  return { key: '', label: '', type: 'text', required: false };
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['admin', 'settings'], queryFn: fetchSettings });

  const [pricePerHourPkr, setPricePerHourPkr] = useState('');
  const [minImages, setMinImages] = useState('');
  const [maxImages, setMaxImages] = useState('');
  const [cityRequired, setCityRequired] = useState(true);
  const [areaRequired, setAreaRequired] = useState(true);
  const [customFields, setCustomFields] = useState<CustomPostField[]>([]);
  const [savedMsg, setSavedMsg] = useState(false);

  // Populate the form once settings load, and again if they change
  // elsewhere (e.g. another admin tab) — but never clobber mid-edit.
  useEffect(() => {
    if (!settingsQuery.data) return;
    const s = settingsQuery.data;
    setPricePerHourPkr(String(s.pricePerHourPkr));
    setMinImages(String(s.minImages));
    setMaxImages(String(s.maxImages));
    setCityRequired(s.cityRequired);
    setAreaRequired(s.areaRequired);
    setCustomFields(s.customFields ?? []);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (input: UpdateAppSettingsInput) => updateSettings(input),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'settings'], data);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    },
  });

  const durationForOneAd24h = Number(pricePerHourPkr || 0) * 24;

  const onSave = () => {
    const price = Number(pricePerHourPkr);
    const min = Number(minImages);
    const max = Number(maxImages);
    if (!Number.isFinite(price) || price < 0) return;
    if (!Number.isInteger(min) || min < 1) return;
    if (!Number.isInteger(max) || max < min) return;

    const cleanedFields = customFields
      .map((f) => ({ ...f, key: f.key.trim(), label: f.label.trim() }))
      .filter((f) => f.key && f.label);

    saveMutation.mutate({
      pricePerHourPkr: price,
      minImages: min,
      maxImages: max,
      cityRequired,
      areaRequired,
      customFields: cleanedFields,
    });
  };

  const updateField = (index: number, patch: Partial<CustomPostField>) => {
    setCustomFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Controls what the mobile app's ad-post form looks like and what it charges — changes apply immediately, no app update needed."
      />

      {settingsQuery.isLoading ? <div className="empty-state">Loading settings…</div> : null}
      {settingsQuery.isError ? (
        <div className="form-error">{errorMessage(settingsQuery.error, 'Could not load settings.')}</div>
      ) : null}

      {settingsQuery.data ? (
        <div className="settings-form">
          <section className="settings-section">
            <h3>Ad pricing</h3>
            <p className="settings-hint">
              Ads are priced at this rate × the number of hours the user picks. Set it to
              1 to charge PKR 1/hour, or 0 to make ads free.
            </p>
            <label className="field-label">PKR per hour</label>
            <input
              className="field-input"
              type="number"
              min={0}
              step="0.01"
              value={pricePerHourPkr}
              onChange={(e) => setPricePerHourPkr(e.target.value)}
            />
            <p className="settings-hint">
              Example: a 24-hour ad currently costs PKR {Number.isFinite(durationForOneAd24h) ? durationForOneAd24h.toFixed(2) : '—'}.
            </p>
          </section>

          <section className="settings-section">
            <h3>Photos</h3>
            <p className="settings-hint">How many photos a user must attach to post an ad.</p>
            <div className="settings-row">
              <div>
                <label className="field-label">Minimum photos</label>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  value={minImages}
                  onChange={(e) => setMinImages(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Maximum photos</label>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  value={maxImages}
                  onChange={(e) => setMaxImages(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3>Built-in fields</h3>
            <p className="settings-hint">
              Title, description, and photos always apply — city and area can be made optional.
            </p>
            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={cityRequired}
                onChange={(e) => setCityRequired(e.target.checked)}
              />
              City is required
            </label>
            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={areaRequired}
                onChange={(e) => setAreaRequired(e.target.checked)}
              />
              Area is required
            </label>
          </section>

          <section className="settings-section">
            <h3>Custom fields</h3>
            <p className="settings-hint">
              Add extra questions to the ad-post form (e.g. "Bedrooms"). They show up on the
              mobile app immediately and are saved per-ad.
            </p>

            {customFields.map((field, i) => (
              <div key={i} className="custom-field-row">
                <input
                  className="field-input"
                  placeholder="Key (e.g. bedrooms)"
                  value={field.key}
                  onChange={(e) => updateField(i, { key: e.target.value })}
                />
                <input
                  className="field-input"
                  placeholder="Label (e.g. Bedrooms)"
                  value={field.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                />
                <select
                  className="field-input"
                  value={field.type}
                  onChange={(e) => updateField(i, { type: e.target.value as 'text' | 'number' })}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                </select>
                <label className="settings-checkbox settings-checkbox--inline">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                  />
                  Required
                </label>
                <button type="button" className="btn btn--sm btn--danger" onClick={() => removeField(i)}>
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setCustomFields((prev) => [...prev, emptyField()])}
            >
              + Add custom field
            </button>
          </section>

          {saveMutation.isError ? (
            <div className="form-error">{errorMessage(saveMutation.error, 'Could not save settings.')}</div>
          ) : null}

          <div className="settings-save-row">
            <button
              type="button"
              className="btn btn--primary"
              disabled={saveMutation.isPending}
              onClick={onSave}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save settings'}
            </button>
            {savedMsg ? <span className="settings-saved">Saved.</span> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
