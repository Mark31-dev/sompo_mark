import { Check, AlertTriangle, X } from "lucide-react";

import { useApp } from "../state/AppContext";

const ICONS = { ok: Check, danger: AlertTriangle, info: Check };

function Toasts() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="sp-toasts">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind] || Check;
        return (
          <div key={toast.id} className={`sp-toast is-${toast.kind}`}>
            <Icon size={15} />
            <span>{toast.text}</span>
            <button type="button" onClick={() => dismissToast(toast.id)}>
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Toasts;
