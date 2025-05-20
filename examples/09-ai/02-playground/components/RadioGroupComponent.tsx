import { Radio, Stack } from "@mantine/core";
import React from "react";

interface RadioGroupComponentProps {
  label: string;
  items: Array<{
    name: string;
    description: string;
    value: string;
  }>;
  value: string;
  onChange: (value: string) => void;
}

const RadioGroupComponent: React.FC<RadioGroupComponentProps> = ({
  label,
  items,
  value,
  onChange,
}) => (
  <Radio.Group label={label} value={value} onChange={onChange}>
    <Stack pt="md" gap="xs">
      {items.map((item) => (
        <Radio value={item.value} label={item.name} key={item.value} />
        // TODO: doesn't work well with our mantive version or styles
        // <Radio.Card
        //   className={styles.root}
        //   radius="md"
        //   value={item.value}
        //   key={item.value}>
        //   <Group wrap="nowrap" align="flex-start">
        //     <Radio.Indicator />
        //     <div>
        //       <Text className={styles.label}>{item.name}</Text>
        //       <Text className={styles.description}>{item.description}</Text>
        //     </div>
        //   </Group>
        // </Radio.Card>
      ))}
    </Stack>
  </Radio.Group>
);

export default RadioGroupComponent;
