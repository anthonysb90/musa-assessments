"use client";
import { useEffect, useState } from "react";

// Time-aware personal greeting for the dashboard header. Rendered on the client
// because it depends on the visitor's LOCAL time of day (the server runs in UTC).
// It first renders a stable "Welcome back" so server and client markup match,
// then swaps in the time-based greeting after mount. Standard greetings are
// weighted higher; a few warmer/playful ones get mixed in for variety.
const BUCKETS = [
  { from: 5, to: 12, std: "Good morning", fun: ["Rise and shine", "Top of the morning", "Bright and early", "Morning, glad you're here"] },
  { from: 12, to: 17, std: "Good afternoon", fun: ["Hope your day's going well", "Good to see you", "Afternoon, friend"] },
  { from: 17, to: 22, std: "Good evening", fun: ["Winding down for the day", "Good to see you tonight", "Hope it was a good day"] },
  { from: 22, to: 5, std: "Good evening", fun: ["Burning the midnight oil", "Up late tonight", "Still going strong"] },
];

function pickGreeting(name) {
  const h = new Date().getHours();
  const b = BUCKETS.find((x) => (x.from < x.to ? h >= x.from && h < x.to : h >= x.from || h < x.to)) || BUCKETS[0];
  // ~55% of the time use the standard greeting, otherwise a fun one.
  const base = Math.random() < 0.55 ? b.std : b.fun[Math.floor(Math.random() * b.fun.length)];
  return base + (name ? `, ${name}` : "");
}

export default function Greeting({ name }) {
  const [text, setText] = useState(name ? `Welcome back, ${name}` : "Welcome back");
  useEffect(() => {
    setText(pickGreeting(name));
  }, [name]);
  return <>{text}</>;
}
