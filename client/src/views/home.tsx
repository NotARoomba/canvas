import { Composer, ComposerRef } from "@/components/composer";

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
    <main className="flex min-h-screen w-screen flex-col items-center justify-center gap-8 sm:gap-16 md:gap-24 lg:gap-32 px-4 sm:px-6 md:px-8">
      <section className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6 sm:gap-8 md:gap-12">
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
    </main>
  );
}
