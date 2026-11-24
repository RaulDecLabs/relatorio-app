import { Link, useRouterState } from "@tanstack/react-router";
import {
  FileText,
  LayoutTemplate,
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

// Dashboard, Clientes, Integrações, Automações e Custos saíram do menu:
// dependem de tabelas/dados que não existem em produção ou são só placeholder.
// O código continua no repo pra quando forem retomados.
const mainItems = [
  { title: "Relatórios de Canais", url: "/reports", icon: FileText, staffOnly: false },
  { title: "Parecer Executivo", url: "/templates", icon: LayoutTemplate, staffOnly: false },
];

const adminItems = [
  { title: "Gestão de Usuários", url: "/users", icon: UserCog },
  { title: "Roadmap", url: "/roadmap", icon: ListChecks },
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
      <SidebarMenuButton
        asChild
        isActive={isActive(item.url)}
        className="h-8 text-[13px] text-sidebar-foreground data-[active=true]:font-semibold"
      >
        <Link to={item.url} className="flex items-center gap-3">
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 pt-4 pb-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[15px] font-bold text-foreground">InsightOS</div>
              <div className="label-caps mt-0.5">Marketing Intelligence</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-1">
        <SidebarGroup className="border-t border-foreground/15 pt-3">
          {!collapsed && <SidebarGroupLabel className="label-caps">{isStaff || isAdmin ? "Principal" : "Menu do Cliente"}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="border-t border-foreground/15 pt-3">
            {!collapsed && <SidebarGroupLabel className="label-caps">Administração</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{adminItems.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
