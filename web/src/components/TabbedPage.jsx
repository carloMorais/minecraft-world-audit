import { PageHeader, Tabs } from './ui.jsx';

/**
 * A page made of tabs (`#items?tab=containers`). Each tab is a page body without its own header;
 * switching tabs navigates, so the previous tab's filters leave the URL.
 */
export default function TabbedPage({ page, title, tabs, nav, go, ...rest }) {
  const T = tabs.find(t => t.id === nav?.tab) || tabs[0];
  const Body = T.el;
  return (
    <div className="page">
      <PageHeader title={title} subtitle={T.subtitle} />
      {tabs.length > 1 && (
        <div className="page-tabs">
          <Tabs label={title} value={T.id} onChange={v => go(page, v === tabs[0].id ? {} : { tab: v })} items={tabs.map(t => ({ value: t.id, label: t.label, icon: <t.icon size={15} /> }))} />
        </div>
      )}
      <Body key={T.id} nav={nav} go={go} {...rest} />
    </div>
  );
}
