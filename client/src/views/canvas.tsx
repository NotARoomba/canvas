import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Info } from "@/components/canvas/info";

interface CanvasProps {
  id: string;
}

export interface CanvasData {
  _id?: {
    $oid?: string;
  };
  prompt?: string;
  difficulty?: number;
  title?: string;
  description?: string;
  outline?: {
    title?: string;
    media_type?: "text" | "image";
    prompt?: string;
  }[];
  steps?: {
    title?: string;
    image?: string | null;
    explanation?: string;
    speech?: string;
    tts?: string;
    references?: string[];
  }[];
  wikipedia_url?: string;
}

export function Canvas({ id }: CanvasProps) {
  const { data, error } = useSWR<{ lesson: CanvasData }>(
    `https://canvas.notaroomba.dev/lessons/${id}`,
    fetcher,
    {
      refreshInterval: 2 * 1000,
    }
  );

  if (!data) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4">
        <div className="h-full w-full animate-pulse rounded-2xl bg-gray-200/80" />
      </div>
    );
  }

  if (error || !data.lesson) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4">
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-white rounded-2xl p-4">
          <h1 className="text-2xl font-bold">No pudimos cargar este canvas</h1>
          <p className="text-gray-600">
            {error?.message ??
              "Hubo un error al cargar el canvas. Por favor, intenta de nuevo."}
          </p>
          <Link href="/" asChild>
            <Button>Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <Info lesson={data.lesson} />;
}
