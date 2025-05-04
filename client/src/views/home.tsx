import { Composer, ComposerRef } from "@/components/composer";
import { Preview } from "@/components/preview";

import { motion } from "motion/react";
import { useState, useRef } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const composerRef = useRef<ComposerRef>(null);

  const [_, navigate] = useLocation();

  async function handleSend({
    prompt,
    educationLevel,
  }: {
    prompt: string;
    educationLevel: number;
  }) {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        "https://canvas.notaroomba.dev/lessons/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, difficulty: educationLevel }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const { id } = await response.json();

      navigate(`/${id}`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-screen flex-col items-center justify-start gap-8 sm:gap-16 md:gap-24 lg:gap-32 px-4 sm:px-6 md:px-8 pt-40 sm:pt-48 md:pt-56 pb-12 sm:pb-16 md:pb-24">
      <section className="w-full flex flex-col items-center gap-6 sm:gap-8 md:gap-12">
        <motion.h1
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          ¿Que quieres aprender hoy?
        </motion.h1>

        <Composer ref={composerRef} isLoading={isLoading} onSend={handleSend} />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 md:p-8 w-full max-w-7xl place-items-center">
        {Array.from({ length: 8 }).map((_, index) => (
          <Preview key={index} composerRef={composerRef} />
        ))}
      </section>
    </main>
  );
}
