import { CreateOrderButton } from "../components/CreateOrderButton";
import { canCreateOrder, canTransitionTo, nextStatusFor } from "../lib/order-status";
import {
  formsEqual,
  hoursValidationMessage,
  isSettingsSaveDisabled,
  normalizeTime,
} from "../lib/settings-form";
import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("Create Order button", () => {
  it("is disabled when the kitchen is closed", () => {
    const onPress = jest.fn();
    render(<CreateOrderButton kitchenOpen={false} onPress={onPress} />);

    fireEvent.press(screen.getByLabelText("Create an Order"));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Create an Order")).toBeDisabled();
  });

  it("is enabled when the kitchen is open", () => {
    const onPress = jest.fn();
    render(<CreateOrderButton kitchenOpen onPress={onPress} />);

    fireEvent.press(screen.getByLabelText("Create an Order"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(canCreateOrder(true)).toBe(true);
  });
});

describe("order status transition helpers", () => {
  it("allows only the next valid kitchen step", () => {
    expect(nextStatusFor("pending")).toBe("preparing");
    expect(nextStatusFor("preparing")).toBe("ready");
    expect(nextStatusFor("ready")).toBe("completed");
    expect(nextStatusFor("completed")).toBeNull();
    expect(nextStatusFor("cancelled")).toBeNull();
  });

  it("rejects invalid transitions including completed → pending", () => {
    expect(canTransitionTo("pending", "preparing")).toBe(true);
    expect(canTransitionTo("pending", "cancelled")).toBe(true);
    expect(canTransitionTo("pending", "ready")).toBe(false);
    expect(canTransitionTo("completed", "pending")).toBe(false);
    expect(canTransitionTo("cancelled", "preparing")).toBe(false);
  });
});

describe("settings form dirty state and validation", () => {
  const baseline = {
    restaurantName: "Ember & Co.",
    prepTimeMinutes: 18,
    autoAcceptOrders: false,
    serviceAvailable: true,
  };

  it("keeps save disabled until a field changes", () => {
    expect(formsEqual(baseline, { ...baseline })).toBe(true);
    expect(
      isSettingsSaveDisabled({
        saving: false,
        loading: false,
        isDirty: !formsEqual(baseline, { ...baseline }),
      }),
    ).toBe(true);

    expect(
      isSettingsSaveDisabled({
        saving: false,
        loading: false,
        isDirty: !formsEqual(baseline, { ...baseline, prepTimeMinutes: 20 }),
      }),
    ).toBe(false);
  });

  it("validates opening hours as HH:MM", () => {
    expect(normalizeTime("9:30")).toBe("09:30");
    expect(normalizeTime("25:00")).toBeUndefined();
    expect(
      hoursValidationMessage({ hasOpenDay: true, start: "09:00", end: "22:00" }),
    ).toBeNull();
    expect(
      hoursValidationMessage({ hasOpenDay: true, start: "nope", end: "22:00" }),
    ).toBe("Opening time must be in HH:MM format");
  });
});
