import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { mergeCSSClasses } from "@blocknote/core";

export const Panel = (props: ComponentProps["ImagePanel"]["Root"]) => {
  return (
    <div className={mergeCSSClasses("wrapper", props.className || "")}>
      <Ariakit.TabProvider
        selectedId={props.openTab}
        setActiveId={(activeId) => {
          if (activeId) {
            props.setOpenTab(activeId);
          }
        }}>
        {/*{props.loading && <LoadingOverlay visible={props.loading} />}*/}

        <Ariakit.TabList className={"tab-list"}>
          {props.tabs.map((tab) => (
            <Ariakit.Tab className={"tab"} id={tab.name} key={tab.name}>
              {tab.name}
            </Ariakit.Tab>
          ))}
        </Ariakit.TabList>

        <div className={"panels"}>
          {props.tabs.map((tab) => (
            <Ariakit.TabPanel tabId={tab.name} key={tab.name}>
              {tab.tabPanel}
            </Ariakit.TabPanel>
          ))}
        </div>
      </Ariakit.TabProvider>
    </div>
  );
};
