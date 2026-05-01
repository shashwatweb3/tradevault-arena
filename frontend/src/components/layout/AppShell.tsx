import type { ReactNode } from "react";
import { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar, type ShellNavItem } from "@/components/layout/Sidebar";

export function AppShell({
  navItems,
  activeKey,
  sidebarFooter,
  mobileNavItems,
  children,
}: {
  navItems: ShellNavItem[];
  activeKey: string;
  sidebarFooter?: ReactNode;
  mobileNavItems: ShellNavItem[];
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="tv-shell relative flex min-h-screen">
      <Sidebar
        items={navItems}
        activeKey={activeKey}
        footer={sidebarFooter}
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />
      <div className={`min-w-0 flex-1 transition-all duration-300 ${collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"}`}>
        <div className="min-h-screen">{children}</div>
        <BottomNav items={mobileNavItems} activeKey={activeKey} />
      </div>
    </div>
  );
}
