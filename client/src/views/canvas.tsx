import { Info } from "@/components/canvas/info";

import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";

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
  const { data } = useSWR<{ lesson: CanvasData }>(
    `http://canvas.notaroomba.dev/lessons/${id}`,
    fetcher,
    {
      refreshInterval: 2 * 1000,
    }
  );

  // const { data, error } = useSWRSubscription<{ lesson: CanvasData }>(
  //   "ws://localhost:3001/",
  //   (key: string, { next }: any) => {

  //   }
  // );
  /**
  const [data, setData] = useState<CanvasData | null>(null);

  useEffect(() => {
    const socket = io("ws://canvas.notaroomba.dev/");
    socket.on("request_lesson_data", (data: any) => {
      console.log("request_lesson_data", data);
    });

    socket.on("update_lesson_data", (data) => {
      console.log("update_lesson_data", data);
      if (!data)
        socket.emit("request_lesson_data", id, (res: any) => {
          alert("request_lesson_data");
          setData(res);
        });
      else {
        setData(data);
      }
    });
    return () => {
      socket.close();
    };
  }, [data]); */

  if (!data) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4">
        <div className="h-full w-full animate-pulse rounded-2xl bg-gray-200/80" />
      </div>
    );
  }

  return <Info lesson={data.lesson} />;
}
