"use client";

import { Camera, Image as ImageIcon, Frame } from "lucide-react";
import { useEffect, useState } from "react";

export function BackgroundVisuals() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <>
            {/* Dynamic shifting background mesh for a brighter, shapeless aesthetic */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-yellow-400/20 via-orange-400/10 to-yellow-500/20 animate-background-shift bg-[length:400%_400%] mix-blend-screen" />

            {/* Film grain material */}
            <div className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-30 bg-noise" />

            {/* Photographic grid framing */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(250,204,21,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.15)_1px,transparent_1px)] [background-size:64px_64px]" />

            {/* Floating pictures/frames/cameras */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <Camera className="absolute top-[15%] left-[10%] text-yellow-500/10 w-24 h-24 animate-float" style={{ animationDelay: "0s", transform: "rotate(-12deg)" }} />
                <ImageIcon className="absolute top-[60%] left-[5%] text-orange-500/10 w-32 h-32 animate-float" style={{ animationDelay: "2s", transform: "rotate(8deg)" }} />
                <Frame className="absolute top-[20%] right-[8%] text-yellow-500/10 w-28 h-28 animate-float" style={{ animationDelay: "1s", transform: "rotate(15deg)" }} />
                <Camera className="absolute bottom-[10%] right-[15%] text-amber-500/10 w-20 h-20 animate-float" style={{ animationDelay: "3s", transform: "rotate(-5deg)" }} />
                <ImageIcon className="absolute top-[5%] left-[40%] text-yellow-500/5 w-16 h-16 animate-float" style={{ animationDelay: "1.5s", transform: "rotate(25deg)" }} />
                <Frame className="absolute bottom-[20%] left-[30%] text-orange-400/5 w-24 h-24 animate-float" style={{ animationDelay: "4s", transform: "rotate(-20deg)" }} />
            </div>

            {/* Viewfinder crosshairs pattern */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[1200px] max-h-[800px] border border-stone-800/20">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-yellow-400/30" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-yellow-400/30" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-yellow-400/30" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-yellow-400/30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-yellow-400/20 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-yellow-400/40 rounded-full" />
            </div>
        </>
    );
}
