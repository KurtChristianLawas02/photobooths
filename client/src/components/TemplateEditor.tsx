import { useEffect, useRef } from 'react';
import { Canvas, Rect, Textbox } from 'fabric';
import { calculateDisplayScale, type PhotoSlot, type PrintTemplate } from '@photobooth/shared';

interface TemplateEditorProps {
  template: PrintTemplate;
  availableWidth: number;
  availableHeight: number;
  onSave: (slots: PhotoSlot[]) => void;
}

export function TemplateEditor({ template, availableWidth, availableHeight, onSave }: TemplateEditorProps) {
  const elementRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const scale = calculateDisplayScale(template.widthPixels, template.heightPixels, { width: availableWidth, height: availableHeight });

  useEffect(() => {
    if (!elementRef.current || scale <= 0) return;
    const canvas = new Canvas(elementRef.current, { width: template.widthPixels * scale, height: template.heightPixels * scale, selection: true });
    canvas.backgroundColor = template.background;

    template.slots.forEach((slot) => {
      const rectangle = new Rect({
        left: slot.x * scale,
        top: slot.y * scale,
        width: slot.width * scale,
        height: slot.height * scale,
        fill: 'rgba(213, 194, 139, .2)',
        stroke: '#d5c28b',
        strokeWidth: 2,
        rx: (slot.borderRadius ?? 0) * scale,
        ry: (slot.borderRadius ?? 0) * scale,
        data: { slotId: slot.id },
      });
      canvas.add(rectangle);
      canvas.add(new Textbox(slot.id, { left: (slot.x + 16) * scale, top: (slot.y + 16) * scale, width: Math.max(80, slot.width * scale - 32), fontSize: Math.max(10, 22 * scale), fill: '#f5f1e9', selectable: false, evented: false }));
    });

    canvas.renderAll();
    canvasRef.current = canvas;
    return () => {
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [scale, template]);

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || scale <= 0) return;
    const movedSlots = template.slots.map((slot) => {
      const object = canvas.getObjects().find((item) => (item as typeof item & { data?: { slotId?: string } }).data?.slotId === slot.id);
      if (!object) return slot;
      return { ...slot, x: Math.round((object.left ?? slot.x * scale) / scale), y: Math.round((object.top ?? slot.y * scale) / scale) };
    });
    onSave(movedSlots);
  };

  return <div className="template-editor"><canvas ref={elementRef} /><div className="editor-toolbar"><span>{template.widthPixels} × {template.heightPixels} px · {Math.round(scale * 100)}% preview</span><button type="button" className="primary-button" onClick={save}>Save template</button></div></div>;
}
