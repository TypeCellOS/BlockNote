import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

export const Panel = (props: ComponentProps["ImagePanel"]["Root"]) => {
  const {
    className,
    tabs,
    defaultOpenTab,
    openTab,
    setOpenTab,
    loading,
    // setLoading,
  } = props;

  return (
    <Mantine.Group className={className}>
      <Mantine.Tabs
        value={openTab}
        defaultValue={defaultOpenTab}
        onChange={setOpenTab as any}>
        {loading && <Mantine.LoadingOverlay visible={loading} />}

        <Mantine.Tabs.List>
          {tabs.map((tab) => (
            <Mantine.Tabs.Tab value={tab.name} key={tab.name}>
              {tab.name}
            </Mantine.Tabs.Tab>
          ))}
        </Mantine.Tabs.List>

        {tabs.map((tab) => (
          <Mantine.Tabs.Panel value={tab.name} key={tab.name}>
            {tab.tabPanel}
          </Mantine.Tabs.Panel>
        ))}
      </Mantine.Tabs>
    </Mantine.Group>
  );
};
