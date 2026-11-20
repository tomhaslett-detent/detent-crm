import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import DealDetail from "@/components/deals/DealDetail";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DealDetailDrawer({ deal, open, onOpenChange, ...actions }) {
  const isMobile = useIsMobile();

  if (!deal) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{deal.title}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto pb-6">
            <DealDetail deal={deal} {...actions} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[400px]">
        <SheetHeader className="sr-only">
          <SheetTitle>{deal.title}</SheetTitle>
        </SheetHeader>
        <DealDetail deal={deal} {...actions} />
      </SheetContent>
    </Sheet>
  );
}