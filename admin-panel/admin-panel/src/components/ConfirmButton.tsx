import { useState } from 'react';

type Props = {
  label: string;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onConfirm: () => void;
};

/**
 * Two-step "are you sure" button, reused by every destructive admin action
 * (block, disable, delete). Click once to arm it, click again within a few
 * seconds to confirm — avoids a full modal for a single action while still
 * preventing accidental clicks.
 */
export function ConfirmButton({ label, confirmLabel = 'Confirm?', tone = 'default', disabled, onConfirm }: Props) {
  const [armed, setArmed] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      className={`btn btn--sm ${tone === 'danger' ? 'btn--danger' : 'btn--ghost'} ${armed ? 'btn--armed' : ''}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
          setTimeout(() => setArmed(false), 3000);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
