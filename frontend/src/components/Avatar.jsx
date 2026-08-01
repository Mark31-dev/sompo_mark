import { avatarFor } from "../data/images";

function Avatar({ name = "?", avatarKey, size = 34, status, showStatus = true, ring = false }) {
  const src = avatarFor(avatarKey, name);

  const classes = ["sp-avatar"];
  if (showStatus && status) classes.push(`is-${status}`);
  if (!showStatus) classes.push("no-dot");
  if (ring) classes.push("has-ring");

  return (
    <span className={classes.join(" ")} style={{ width: size, height: size }} title={name}>
      <img src={src} alt={name} loading="lazy" />
    </span>
  );
}

export default Avatar;
