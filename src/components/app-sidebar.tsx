import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Sparkles,
  Plug,
  LayoutTemplate,
  Workflow,
  Wallet,
  Settings,
  UserCog,
  TrendingUp,
  ListChecks,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRoles } from "@/hooks/use-role";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Relatórios", url: "/reports", icon: FileText },
  { title: "IA Insights", url: "/ai-insights", icon: Sparkles },
];

const opsItems = [
  { title: "Integrações", url: "/integrations", icon: Plug },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
  { title: "Automações", url: "/automations", icon: Workflow },
];

const adminItems = [
  { title: "Roadmap", url: "/roadmap", icon: ListChecks, adminOnly: true },
  { title: "Custos", url: "/costs", icon: Wallet, adminOnly: true },
  { title: "Usuários", url: "/users", icon: UserCog, adminOnly: true },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin } = useRoles();

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

  const renderItem = (item: { title: string; url: string; icon: typeof Users }) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={isActive(item.url)}>
        <Link to={item.url} className="flex items-center gap-3">
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold">InsightOS</div>
              <div className="text-[11px] text-muted-foreground">Marketing Intelligence</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Operação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{opsItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Administração</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems
                .filter((i) => !i.adminOnly || isAdmin)
                .map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
