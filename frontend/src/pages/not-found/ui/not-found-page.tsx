import { RouteStubPage } from '../../../shared/ui/route-stub/route-stub-page';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

export function NotFoundPage() {
  return (
    <SiteShell>
      <RouteStubPage
        description="Маршрут не найден. Это fallback-страница для любых путей, которых пока нет в приложении."
        details={[
          'Проверь путь в адресной строке.',
          'Для текущего каркаса поддерживаются public и admin routes из документации.',
        ]}
        routeLabel="*"
        title="Page Not Found"
      />
    </SiteShell>
  );
}
