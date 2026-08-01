import { useEffect, useRef } from "react";
import { X } from "lucide-react";

function Modal({ title, subtitle, onClose, children, size = "md" }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector("input, textarea, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sp-overlay" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className={`sp-modal sp-modal--${size}`}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="sp-modal-close" onClick={onClose} title="Close">
          <X size={17} />
        </button>

        {(title || subtitle) && (
          <div className="sp-modal-head">
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

export default Modal;
