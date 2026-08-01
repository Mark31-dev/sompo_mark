import { useState } from "react";

import { EMOJI_GROUPS } from "../data/chat";

function EmojiPicker({ onPick, onClose }) {
  const [group, setGroup] = useState(EMOJI_GROUPS[0].id);
  const active = EMOJI_GROUPS.find((g) => g.id === group) || EMOJI_GROUPS[0];

  return (
    <div className="sp-emoji">
      <div className="sp-emoji-tabs">
        {EMOJI_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={group === item.id ? "is-active" : ""}
            title={item.label}
            onClick={() => setGroup(item.id)}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <div className="sp-emoji-grid">
        {active.items.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onPick(emoji);
              onClose?.();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EmojiPicker;
