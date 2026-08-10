import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Plug,
  LayoutTemplate,
  Workflow,
  Wallet,
  Settings,
  UserCog,
  TrendingUp,
  ListChecks,
  BarChart3,
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
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, staffOnly: true },
  { title: "Clientes", url: "/clients", icon: Users, staffOnly: true },
  { title: "Relatórios de Canais", url: "/reports", icon: FileText, staffOnly: false },
  { title: "Parecer Executivo", url: "/templates", icon: LayoutTemplate, staffOnly: false },
];

const opsItems = [
  { title: "Integrações", url: "/integrations", icon: Plug },
  { title: "Automações", url: "/automations", icon: Workflow },
];

const adminItems = [
  { title: "Gestão de Usuários", url: "/users", icon: UserCog },
  { title: "Roadmap", url: "/roadmap", icon: ListChecks },
  { title: "Custos", url: "/costs", icon: Wallet },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin, isStaff } = useRoles();

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

  const renderItem = (item: { title: string; url: string; icon: any }) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={isActive(item.url)}>
        <Link to={item.url} className="flex items-center gap-3">
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  // Se o usuário não for equipe da agência ou admin (ex: é Cliente), ele vê APENAS relatórios de canais e parecer executivo.
  const visibleMainItems = mainItems.filter((item) => !item.staffOnly || (isStaff || isAdmin));

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
          {!collapsed && <SidebarGroupLabel>{isStaff || isAdmin ? "Principal" : "Menu do Cliente"}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{visibleMainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isStaff || isAdmin) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Operação</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{opsItems.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Administração</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{adminItems.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
