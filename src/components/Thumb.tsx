"use client";
import { useState } from "react";

/** A cover or video thumbnail that quietly falls back to its placeholder if the image fails to load. */
export default function Thumb({ src, fallback, contain = false }: { src?: string | null; fallback: React.ReactNode; contain?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {contain && <img className="thumb-bg" src={src} alt="" aria-hidden loading="lazy" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={contain ? "thumb-img contain" : "thumb-img"} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    </>
  );
}
