import { useState, useEffect, useRef } from "react";
import { BODY_MEDIA, BODY_MEDIA_ROTATE_MS, BODY_MAP_IMAGE, ORGAN_HOTSPOTS } from "@/data/content";

export default function OrganAvatar() {
  const [activeOrgan, setActiveOrgan] = useState(null);
  const [index, setIndex] = useState(0);
  const videoRefs = useRef({});

  const media = BODY_MEDIA || [];
  const hasMedia = media.length > 0;

  // Rotationen: nästa bild eller film tonas in efter angivet intervall.
  useEffect(() => {
    if (media.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % media.length);
    }, BODY_MEDIA_ROTATE_MS);
    return () => clearInterval(timer);
  }, [media.length]);

  // Bara den film som syns spelar – övriga pausas så de inte tuggar batteri.
  useEffect(() => {
    media.forEach((item, i) => {
      if (item.type !== "video") return;
      const el = videoRefs.current[item.src];
      if (!el) return;
      if (i === index) {
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [index, media]);

  const current = hasMedia ? media[index] : null;

  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-secondary/40">
        {hasMedia ? (
          <>
            {media.map((item, i) =>
              item.type === "video" ? (
                <video
                  key={item.src}
                  ref={(el) => { videoRefs.current[item.src] = el; }}
                  src={item.src}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="auto"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: i === index ? 1 : 0, transition: "opacity 1.2s ease-in-out" }}
                />
              ) : (
                <img
                  key={item.src}
                  src={item.src}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: i === index ? 1 : 0, transition: "opacity 1.2s ease-in-out" }}
                />
              )
            )}

            {/* Mjuk vinjett så att texten under alltid går att läsa */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35 pointer-events-none" />

            {current?.caption && (
              <span className="absolute bottom-2 right-2.5 text-[10px] font-medium text-white/80 drop-shadow pointer-events-none">
                {current.caption}
              </span>
            )}

            {media.length > 1 && (
              <div className="absolute bottom-2 left-2.5 flex items-center gap-1">
                {media.map((item, i) => (
                  <button
                    key={item.src}
                    onClick={() => setIndex(i)}
                    aria-label={`Visa bild ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-4 bg-white/90" : "w-1.5 bg-white/45 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <img src={BODY_MAP_IMAGE} alt="Kroppskarta" className="w-full h-full object-contain" />
        )}
      </div>

      {/* Områdena som följs – klickbara för detalj */}
      <div className="mt-3 min-h-[56px] w-full text-center">
        {ORGAN_HOTSPOTS.length === 0 ? (
          <p className="text-xs text-muted-foreground">Inga markerade områden</p>
        ) : activeOrgan ? (
          <div className="animate-in fade-in duration-200">
            <p className="text-sm font-semibold text-foreground">
              {ORGAN_HOTSPOTS.find((o) => o.id === activeOrgan)?.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {ORGAN_HOTSPOTS.find((o) => o.id === activeOrgan)?.detail}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Berörda områden</p>
            <div className="flex justify-center gap-1.5 flex-wrap">
              {ORGAN_HOTSPOTS.map((o) => (
                <button
                  key={o.id}
                  onMouseEnter={() => setActiveOrgan(o.id)}
                  onMouseLeave={() => setActiveOrgan(null)}
                  onClick={() => setActiveOrgan(activeOrgan === o.id ? null : o.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-transform hover:scale-105"
                  style={{ backgroundColor: o.color + "22", color: o.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: o.color }} />
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
