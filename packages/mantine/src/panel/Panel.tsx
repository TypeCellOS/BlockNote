import { Group, Tabs, LoadingOverlay } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
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
    loading,
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <Group className={className} ref={ref}>
      <Tabs
        value={openTab}
        defaultValue={defaultOpenTab}
        onChange={setOpenTab as any}>
        {loading && <LoadingOverlay visible={loading} />}

        <Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Tab
              data-test={`${tab.name.toLowerCase()}-tab`}
              value={tab.name}
              key={tab.name}>
              {tab.name}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {tabs.map((tab) => (
          <Tabs.Panel value={tab.name} key={tab.name}>
            {tab.tabPanel}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Group>
  );
});
