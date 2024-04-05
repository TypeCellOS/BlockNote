import * as Ariakit from "@ariakit/react";

import { PanelProps } from "@blocknote/react";

export const Panel = (props: PanelProps) => {
  return (
    <div className={"bn-image-panel"}>
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
            <Ariakit.Tab id={tab.name} className={"tab"} key={tab.name}>
              {tab.name}
            </Ariakit.Tab>
          ))}
        </Ariakit.TabList>

        {props.tabs.map((tab) => (
          <Ariakit.TabPanel tabId={tab.name} className={"panel"} key={tab.name}>
            {tab.tabPanel}
          </Ariakit.TabPanel>
        ))}
      </Ariakit.TabProvider>
    </div>
  );
};
