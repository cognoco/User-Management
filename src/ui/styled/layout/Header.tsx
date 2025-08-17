import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, User, LogOut, Settings, Home } from "lucide-react";
import { Button } from "@/ui/primitives/button";
import { LanguageSelector } from "@/ui/styled/settings/LanguageSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/primitives/dropdown-menu";
import {
  Header as HeadlessHeader,
  NavItem,
} from "../../headless/layout/Header";

interface HeaderProps {
  type?: "fixed" | "static" | "sticky";
}

export function Header({ type = "fixed" }: HeaderProps): React.ReactElement {
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    {
      to: "/",
      label: t("common.home"),
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    {
      to: "/settings",
      label: t("settings.title"),
      icon: <Settings className="h-4 w-4 mr-2" />,
    },
    {
      to: "/profile",
      label: t("profile.title"),
      icon: <User className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <HeadlessHeader type={type} navItems={navItems}>
      {({
        mobileMenuOpen,
        setMobileMenuOpen,
        handleLogout,
        isLoading,
        user,
        headerClasses,
        navItems,
      }) => (
        <header className={headerClasses}>
          <div className="container mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 relative z-20">
              <span className="font-bold text-xl">User Management</span>
            </Link>

            <div className="hidden md:flex items-center space-x-6">
              <nav className="flex items-center space-x-4">
                {navItems.slice(1).map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center space-x-4">
                <LanguageSelector />
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isLoading}
                        aria-label={t("profile.menu")}
                      >
                        <User className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          {t("profile.title")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          {t("settings.title")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        disabled={isLoading}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t("auth.logout")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/login">
                    <Button disabled={isLoading}>{t("auth.login")}</Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="md:hidden flex items-center gap-3">
              <LanguageSelector minimal={true} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                disabled={isLoading}
                aria-label={
                  mobileMenuOpen ? t("common.close") : t("common.menu")
                }
                className="relative z-20"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6 transition-transform duration-300" />
                ) : (
                  <Menu className="h-6 w-6 transition-transform duration-300" />
                )}
              </Button>
            </div>
          </div>

          <div
            className={`fixed inset-0 z-10 bg-background transition-transform duration-300 ease-in-out pt-16 ${
              mobileMenuOpen ? "translate-y-0" : "translate-y-full"
            } md:hidden`}
          >
            <div className="container mx-auto py-6 h-full overflow-y-auto">
              <nav className="flex flex-col space-y-6">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="px-2 py-3 text-lg font-medium flex items-center transition-colors hover:text-primary border-b border-border/30"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
                {user ? (
                  <Button
                    variant="ghost"
                    className="justify-start px-2 py-6 h-auto text-lg"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    disabled={isLoading}
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    {t("auth.logout")}
                  </Button>
                ) : (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="default"
                      size="lg"
                      disabled={isLoading}
                      className="w-full mt-4"
                    >
                      {t("auth.login")}
                    </Button>
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </header>
      )}
    </HeadlessHeader>
  );
}
