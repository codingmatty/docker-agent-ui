import { useState } from 'react';
import type { StreamEvent } from './types';

interface ToolConfirmModalProps {
  event: StreamEvent;
  onConfirm: (approved: boolean, denial?: string) => void;
}

export function ToolConfirmModal({ event, onConfirm }: ToolConfirmModalProps) {
  const [denial, setDenial] = useState('');

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">Tool call approval</h3>
        <p className="py-2 text-base-content/80">
          The agent wants to run a tool. Approve or deny.
        </p>
        <pre className="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto max-h-60 overflow-y-auto">
          {JSON.stringify(event, null, 2)}
        </pre>
        <div className="modal-action flex-wrap gap-2">
          <input
            type="text"
            placeholder="Denial reason (optional)"
            className="input input-bordered flex-1 min-w-0"
            value={denial}
            onChange={(e) => setDenial(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-error"
            onClick={() => onConfirm(false, denial || undefined)}
          >
            Deny
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onConfirm(true)}
          >
            Approve
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/50">
        <button type="button">close</button>
      </form>
    </dialog>
  );
}
