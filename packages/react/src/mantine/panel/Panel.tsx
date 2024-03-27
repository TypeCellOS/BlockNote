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

        {/*<Tabs.List>*/}
        {/*  {editor.uploadFile !== undefined && (*/}
        {/*    <Tabs.Tab value={"default"} data-test={"upload-tab"}>*/}
        {/*      Upload*/}
        {/*    </Tabs.Tab>*/}
        {/*  )}*/}
        {/*  <Tabs.Tab*/}
        {/*    value={editor.uploadFile === undefined ? "default" : "embed"}*/}
        {/*    data-test={"embed-tab"}>*/}
        {/*    Embed*/}
        {/*  </Tabs.Tab>*/}
        {/*</Tabs.List>*/}

        {/*{editor.uploadFile !== undefined && (*/}
        {/*  <Tabs.Panel className={"bn-upload-image-panel"} value="default">*/}
        {/*    <UploadTab block={props.block} setLoading={setLoading} />*/}
        {/*  </Tabs.Panel>*/}
        {/*)}*/}
        {/*<Tabs.Panel*/}
        {/*  className={"bn-embed-image-panel"}*/}
        {/*  value={editor.uploadFile === undefined ? "default" : "embed"}>*/}
        {/*  <EmbedTab block={props.block} />*/}
        {/*</Tabs.Panel>*/}
      </Tabs>
    </Group>
  );
};
