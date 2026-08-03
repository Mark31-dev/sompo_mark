import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import NowPlaying from "./NowPlaying";
import OnlineMembers from "./OnlineMembers";
import Visualizer from "./Visualizer";
import { QUOTES } from "../data/seed";
import { usePlayer } from "../state/PlayerContext";

function RightRail({ onView }) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const { playing } = usePlayer();

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((current) => (current + 1) % QUOTES.length);
    }, 12_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="sp-rail">
  <NowPlaying />
  <OnlineMembers onViewAll={() => onView("members")} />

  <div style={{height: "500px"}} />

  <div className="sp-quote">
    <p>&ldquo;{QUOTES[quoteIndex]}&rdquo;</p>
    <Heart size={20} fill="currentColor" />
    <Visualizer bars={18} height={22} gap={2} idle={!playing} className="sp-quote-vis" />
  </div>
</aside>
  );
}

export default RightRail;
