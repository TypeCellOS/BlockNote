import * as Ariakit from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Panel = forwardRef<
  HTMLDivElement,
  ComponentProps["ImagePanel"]["Root"]
>((props, ref) => {
  const {
    className,
    tabs,
    defaultOpenTab,
    openTab,
    setOpenTab,
    loading, // TODO: implement loading
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <div
      className={mergeCSSClasses("bn-ak-wrapper", className || "")}
      ref={ref}>
      <Ariakit.TabProvider
        defaultSelectedId={defaultOpenTab}
        selectedId={openTab}
        setActiveId={(activeId) => {
          if (activeId) {
            setOpenTab(activeId);
          }
        }}>
        {/*{loading && <LoadingOverlay visible={loading} />}*/}

        <Ariakit.TabList className={"bn-ak-tab-list"}>
          {tabs.map((tab) => (
            <Ariakit.Tab className={"bn-ak-tab"} id={tab.name} key={tab.name}>
              {tab.name}
            </Ariakit.Tab>
          ))}
        </Ariakit.TabList>

        <div className={"bn-ak-panels"}>
          {tabs.map((tab) => (
            <Ariakit.TabPanel tabId={tab.name} key={tab.name}>
              {tab.tabPanel}
            </Ariakit.TabPanel>
          ))}
        </div>
      </Ariakit.TabProvider>
    </div>
  );
});
