import { Camera, Check, Loader } from "lucide-react";
import { cn } from "@/lib/design-system/utils";

interface EvidenceItem {
  id: string;
  label: string;
  completed?: boolean;
  // Antes la galería los recibía pero nunca los usaba: solo pintaba el
  // ícono de cámara o el check según `completed`, sin mostrar la foto
  // real ni indicar que una subida estaba en curso.
  previewUrl?: string;
  subiendo?: boolean;
}

interface RREvidenceGalleryProps {
  items?: EvidenceItem[];
  onSelect?: (id: string) => void;
}

const defaultItems: EvidenceItem[] = [
  { id: "front", label: "Frente" },
  { id: "driver", label: "Lado conductor" },
  { id: "rear", label: "Trasera" },
  { id: "passenger", label: "Lado copiloto" },
  { id: "dashboard", label: "Tablero" },
];

export function RREvidenceGallery({ items = defaultItems, onSelect }: RREvidenceGalleryProps) {
  return (
    <div>
      <div className="mb-3">
        <p className="text-sm font-black text-rr-black">Evidencia fotográfica</p>
        <p className="text-xs text-rr-gray500">Captura los ángulos obligatorios del vehículo.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            disabled={item.subiendo}
            className={cn(
              "relative flex min-h-[120px] flex-col items-center justify-center overflow-hidden rounded-rrLg border-2 border-dashed p-4 transition",
              item.completed
                ? "border-rr-success bg-rr-successLight text-rr-success"
                : "border-rr-gray200 bg-white text-rr-gray500 hover:border-rr-primary hover:bg-rr-primaryLight"
            )}
          >
            {item.previewUrl && (
              // Miniatura real de la foto ya tomada, no solo un ícono
              // genérico — así el conductor ve qué capturó en cada slot.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.previewUrl}
                alt={item.label}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div
              className={cn(
                "relative z-10 flex flex-col items-center",
                item.previewUrl && "rounded-rrSm bg-black/45 px-2 py-1 text-white"
              )}
            >
              {item.subiendo ? (
                <Loader className="mb-2 h-6 w-6 animate-spin" />
              ) : item.completed ? (
                <Check className="mb-2 h-6 w-6" />
              ) : (
                <Camera className="mb-2 h-6 w-6" />
              )}
              <span className="text-xs font-bold">
                {item.subiendo ? "Subiendo..." : item.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}