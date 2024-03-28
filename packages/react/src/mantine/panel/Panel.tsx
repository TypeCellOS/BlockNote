import { Group, LoadingOverlay, Tabs } from "@mantine/core";

import { PanelProps } from "../../editor/ComponentsContext";

export const Panel = (props: PanelProps) => {
  return (
    <Group className={"bn-image-panel"}>
      <Tabs value={props.openTab} onChange={props.setOpenTab as any}>
        {props.loading && <LoadingOverlay visible={props.loading} />}

        <Tabs.List>
          {props.tabs.map((tab) => (
            <Tabs.Tab value={tab.name} key={tab.name}>
              {tab.name}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {props.tabs.map((tab) => (
          <Tabs.Panel
            // className={"bn-upload-image-panel"}
            value={tab.name}
            key={tab.name}>
            {tab.tabPanel}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Group>
  );
};
