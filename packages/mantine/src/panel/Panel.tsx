import * as Mantine from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
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
    loading,
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <Mantine.Group className={className} ref={ref}>
      <Mantine.Tabs
        value={openTab}
        defaultValue={defaultOpenTab}
        onChange={setOpenTab as any}>
        {loading && <Mantine.LoadingOverlay visible={loading} />}

        <Mantine.Tabs.List>
          {tabs.map((tab) => (
            <Mantine.Tabs.Tab
              data-test={`${tab.name.toLowerCase()}-tab`}
              value={tab.name}
              key={tab.name}>
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
});
