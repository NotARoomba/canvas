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
    <main className="flex h-screen w-screen flex-col items-center justify-center gap-32">
      <section className="w-full flex flex-col items-center gap-12">
        <motion.h1
          className="text-5xl font-bold text-gray-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          ¿Que quieres aprender hoy?
        </motion.h1>

        <Composer ref={composerRef} isLoading={isLoading} onSend={handleSend} />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-8 w-full max-w-7xl place-items-center">
        {Array.from({ length: 8 }).map((_, index) => (
          <Preview key={index} composerRef={composerRef} />
        ))}
      </section>
    </main>
  );
}
