import { PanelProps } from "../../../react/src";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

export const Panel = (props: PanelProps) => {
  return (
    <Tabs
      className={"bn-image-panel"}
      value={props.openTab}
      onValueChange={props.setOpenTab}>
      {/*{props.loading && <LoadingOverlay visible={props.loading} />}*/}

      <TabsList>
        {props.tabs.map((tab) => (
          <TabsTrigger value={tab.name} key={tab.name}>
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {props.tabs.map((tab) => (
        <TabsContent
          // className={"bn-upload-image-panel"}
          value={tab.name}
          key={tab.name}>
          {tab.tabPanel}
        </TabsContent>
      ))}
    </Tabs>
  );
};
