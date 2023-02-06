import { Box, Menu } from "@mantine/core";
import { ColorIcon } from "./ColorIcon";
import { TiTick } from "react-icons/ti";
import { useCallback, useState } from "react";
import { HiChevronDown } from "react-icons/hi";

export const ColorPicker = (props: {
  onClick?: () => void;
  iconSize?: number;
  textColor: string;
  setTextColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
}) => {
  return (
    <>
      <Menu.Label>Text</Menu.Label>
      <Menu.Item
        onClick={() => props.setTextColor("default")}
        component={"div"}
        icon={<ColorIcon textColor={"default"} size={props.iconSize} />}
        rightSection={
          props.textColor === "default" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Default
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setTextColor("gray");
        }}
        component={"div"}
        icon={<ColorIcon textColor={"gray"} size={props.iconSize} />}
        rightSection={
          props.textColor === "gray" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Gray
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setTextColor("brown");
        }}
        component={"div"}
        icon={<ColorIcon textColor={"brown"} size={props.iconSize} />}
        rightSection={
          props.textColor === "brown" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Brown
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setTextColor("red");
        }}
        component={"div"}
        icon={<ColorIcon textColor={"red"} size={props.iconSize} />}
        rightSection={
          props.textColor === "red" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Red
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setTextColor("orange");
        }}
        component={"div"}
        icon={<ColorIcon textColor={"orange"} size={props.iconSize} />}
        rightSection={
          props.textColor === "orange" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Orange
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setTextColor("yellow");
        }}
        component={"div"}
        icon={<ColorIcon textColor={"yellow"} size={props.iconSize} />}
        rightSection={
          props.textColor === "yellow" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Yellow
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setTextColor("green");
        }}
        component={"div"}
        icon={<ColorIcon textColor={"green"} size={props.iconSize} />}
        rightSection={
          props.textColor === "green" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Green
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setTextColor("blue");
        }}
        component={"div"}
        icon={<ColorIcon textColor={"blue"} size={props.iconSize} />}
        rightSection={
          props.textColor === "blue" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Blue
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setTextColor("purple");
        }}
        component={"div"}
        icon={<ColorIcon textColor={"purple"} size={props.iconSize} />}
        rightSection={
          props.textColor === "purple" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Purple
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setTextColor("pink");
        }}
        component={"div"}
        icon={<ColorIcon textColor={"pink"} size={props.iconSize} />}
        rightSection={
          props.textColor === "pink" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Pink
      </Menu.Item>
      <Menu.Label>Background</Menu.Label>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setBackgroundColor("default");
        }}
        component={"div"}
        icon={<ColorIcon backgroundColor={"default"} size={props.iconSize} />}
        rightSection={
          props.backgroundColor === "default" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Default
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setBackgroundColor("gray");
        }}
        component={"div"}
        icon={<ColorIcon backgroundColor={"gray"} size={props.iconSize} />}
        rightSection={
          props.backgroundColor === "gray" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Gray
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setBackgroundColor("brown");
        }}
        component={"div"}
        icon={<ColorIcon backgroundColor={"brown"} size={props.iconSize} />}
        rightSection={
          props.backgroundColor === "brown" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Brown
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setBackgroundColor("red");
        }}
        component={"div"}
        icon={<ColorIcon backgroundColor={"red"} size={props.iconSize} />}
        rightSection={
          props.backgroundColor === "red" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Red
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setBackgroundColor("orange");
        }}
        component={"div"}
        icon={<ColorIcon backgroundColor={"orange"} size={props.iconSize} />}
        rightSection={
          props.backgroundColor === "orange" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Orange
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setBackgroundColor("yellow");
        }}
        component={"div"}
        icon={<ColorIcon backgroundColor={"yellow"} size={props.iconSize} />}
        rightSection={
          props.backgroundColor === "yellow" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Yellow
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setBackgroundColor("green");
        }}
        component={"div"}
        icon={<ColorIcon backgroundColor={"green"} size={props.iconSize} />}
        rightSection={
          props.backgroundColor === "green" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Green
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setBackgroundColor("blue");
        }}
        component={"div"}
        icon={<ColorIcon backgroundColor={"blue"} size={props.iconSize} />}
        rightSection={
          props.backgroundColor === "blue" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Blue
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setBackgroundColor("purple");
        }}
        component={"div"}
        icon={<ColorIcon backgroundColor={"purple"} size={props.iconSize} />}
        rightSection={
          props.backgroundColor === "purple" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Purple
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          props.onClick && props.onClick();
          props.setBackgroundColor("pink");
        }}
        component={"div"}
        icon={<ColorIcon backgroundColor={"pink"} size={props.iconSize} />}
        rightSection={
          props.backgroundColor === "pink" ? (
            <TiTick size={16} style={{ paddingLeft: "8px" }} />
          ) : (
            <div style={{ width: "24px", padding: "0" }} />
          )
        }>
        Pink
      </Menu.Item>
    </>
  );
};
