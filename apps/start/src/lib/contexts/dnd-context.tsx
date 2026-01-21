'use client';

import { 
  DndContext, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  KeyboardSensor,
  pointerWithin,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DragCancelEvent,
  Modifier
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface AppDndProviderProps {
  children: React.ReactNode;
}

export function AppDndProvider({ children }: AppDndProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // We rely on useDndMonitor in child components to handle actual logic
  // This provider just establishes the context and sensors
  
  return (
    <DndProvider backend={HTML5Backend}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        modifiers={[snapCenterToCursor]}
      >
        {children}
      </DndContext>
    </DndProvider>
  );
}
