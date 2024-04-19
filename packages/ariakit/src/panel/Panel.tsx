import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { mergeCSSClasses } from "@blocknote/core";

export const Panel = (props: ComponentProps["ImagePanel"]["Root"]) => {
  const {
    className,
    tabs,
    defaultOpenTab,
    openTab,
    setOpenTab,
    // loading,
    // setLoading,
  } = props;

  return (
    <div className={mergeCSSClasses("wrapper", className || "")}>
      <Ariakit.TabProvider
        defaultSelectedId={defaultOpenTab}
        selectedId={openTab}
        setActiveId={(activeId) => {
          if (activeId) {
            setOpenTab(activeId);
          }
        }}>
        {/*{loading && <LoadingOverlay visible={loading} />}*/}

        <Ariakit.TabList className={"tab-list"}>
          {tabs.map((tab) => (
            <Ariakit.Tab className={"tab"} id={tab.name} key={tab.name}>
              {tab.name}
            </Ariakit.Tab>
          ))}
        </Ariakit.TabList>

        <div className={"panels"}>
          {tabs.map((tab) => (
            <Ariakit.TabPanel tabId={tab.name} key={tab.name}>
              {tab.tabPanel}
            </Ariakit.TabPanel>
          ))}
        </div>
      </Ariakit.TabProvider>
    </div>
  );
};
