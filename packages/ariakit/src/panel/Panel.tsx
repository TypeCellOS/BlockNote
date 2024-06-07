import {
  Tab as AriakitTab,
  TabList as AriakitTabList,
  TabPanel as AriakitTabPanel,
  TabProvider as AriakitTabProvider,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Panel = forwardRef<
  HTMLDivElement,
  ComponentProps["FilePanel"]["Root"]
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
      <AriakitTabProvider
        defaultSelectedId={defaultOpenTab}
        selectedId={openTab}
        setActiveId={(activeId) => {
          if (activeId) {
            setOpenTab(activeId);
          }
        }}>
        {/*{loading && <LoadingOverlay visible={loading} />}*/}

        <AriakitTabList className={"bn-ak-tab-list"}>
          {tabs.map((tab) => (
            <AriakitTab className={"bn-ak-tab"} id={tab.name} key={tab.name}>
              {tab.name}
            </AriakitTab>
          ))}
        </AriakitTabList>

        <div className={"bn-ak-panels"}>
          {tabs.map((tab) => (
            <AriakitTabPanel tabId={tab.name} key={tab.name}>
              {tab.tabPanel}
            </AriakitTabPanel>
          ))}
        </div>
      </AriakitTabProvider>
    </div>
  );
});
