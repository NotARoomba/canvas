import { CanvasData } from "@/views/canvas";

interface AreaProps {
  lesson: CanvasData;
}

export function Area({ lesson }: AreaProps) {
  return (
    <div>
      {lesson.steps ? (
        <div>
          {lesson.steps.map((step, index) => (
            <div key={index}>
              <pre>{JSON.stringify(step, null, 2)}</pre>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
}
