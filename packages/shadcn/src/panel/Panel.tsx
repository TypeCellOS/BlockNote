import * as ShadCNCard from "../components/ui/card";
import * as ShadCNTabs from "../components/ui/tabs";
import { ComponentProps } from "@blocknote/react";

export const Panel = (
  props: ComponentProps["ImagePanel"]["Root"] &
    Partial<{
      Tabs: typeof ShadCNTabs.Tabs;
      TabsList: typeof ShadCNTabs.TabsList;
      TabsTrigger: typeof ShadCNTabs.TabsTrigger;
      TabsContent: typeof ShadCNTabs.TabsContent;
    }>
) => {
  const Tabs = props.Tabs || ShadCNTabs.Tabs;
  const TabsList = props.TabsList || ShadCNTabs.TabsList;
  const TabsTrigger = props.TabsTrigger || ShadCNTabs.TabsTrigger;
  const TabsContent = props.TabsContent || ShadCNTabs.TabsContent;

  return (
    <Tabs value={props.openTab} onValueChange={props.setOpenTab}>
      {/*{props.loading && <LoadingOverlay visible={props.loading} />}*/}

      <TabsList>
        {props.tabs.map((tab) => (
          <TabsTrigger value={tab.name} key={tab.name}>
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {props.tabs.map((tab) => (
        <TabsContent value={tab.name} key={tab.name}>
          <ShadCNCard.Card>
            <ShadCNCard.CardContent>{tab.tabPanel}</ShadCNCard.CardContent>
          </ShadCNCard.Card>
        </TabsContent>
      ))}
    </Tabs>
  );
};
