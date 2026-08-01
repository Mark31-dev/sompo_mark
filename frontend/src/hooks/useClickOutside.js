import { useEffect, useRef } from "react";

export default function useClickOutside(onOutside, active = true) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onOutside(event);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside, active]);

  return ref;
}
