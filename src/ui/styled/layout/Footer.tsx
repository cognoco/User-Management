import { useTranslation } from "react-i18next";
// Already refactored to use headless Footer
import {
  Footer as HeadlessFooter,
  FooterProps as HeadlessProps,
} from "../../headless/layout/Footer";

interface FooterProps extends Omit<HeadlessProps, "children"> {}

export function Footer({ position = "static" }: FooterProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <HeadlessFooter position={position}>
      {({ footerClasses, year }) => (
        <footer className={footerClasses}>
          <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {year} User Management. {t("common.allRightsReserved")}
            </p>

            <nav className="flex items-center gap-4 text-sm">
              <a
                href="#"
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                {t("common.privacy")}
              </a>
              <a
                href="#"
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                {t("common.terms")}
              </a>
            </nav>
          </div>
        </footer>
      )}
    </HeadlessFooter>
  );
}
