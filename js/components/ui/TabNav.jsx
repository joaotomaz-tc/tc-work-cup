import { TAB_NAV } from '../../data/config.js';
import { selectTab } from '../../lib/tabs.js';

function sectionForTab(tab) {
  return TAB_NAV.find(
    s => s.key === tab || s.children?.some(([k]) => k === tab),
  ) || null;
}

export function TabNav({ tab, setTab }) {
  const activeSection = sectionForTab(tab);
  const subTabs = activeSection?.children;

  return (
    <>
      <nav className="wc-tabs" aria-label="Sections">
        {TAB_NAV.map(section => {
          const standalone = !section.children;
          const isOn = standalone
            ? tab === section.key
            : section.children.some(([k]) => k === tab);
          const target = standalone ? section.key : section.children[0][0];
          return (
            <button
              key={section.key}
              type="button"
              className={"wc-tab" + (isOn ? " is-on" : "")}
              onClick={() => selectTab(target, setTab)}
            >
              {section.label}
            </button>
          );
        })}
      </nav>
      {subTabs && (
        <nav className="wc-subtabs" aria-label={`${activeSection.label} views`}>
          {subTabs.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={"wc-subtab" + (tab === k ? " is-on" : "")}
              onClick={() => selectTab(k, setTab)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
