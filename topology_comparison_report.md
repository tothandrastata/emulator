# LW3 Topology Comparison: GVN-MMU Device vs. Emulator

I have compared the LW3 topology of the physical **GVN-MMU-X100** (at 10.0.129.53) with the provided GVN emulator. Below is a detailed breakdown of the structural similarities and discrepancies found.

## Summary Table

| Feature                   | Physical Device (10.0.129.53)  | Emulator (local)              |
| :------------------------ | :----------------------------- | :---------------------------- |
| **Product Name**          | `GVN-MMU-X100`                 | `GVN-MMU`                     |
| **Package Version**       | `v1.7.0b9`                     | `v1.0.0`                      |
| **Input Nodes (I)**       | `I101`, `I201`, `I301`, `I401` | `I101`, `I201`, `I301`        |
| **Source Nodes (S)**      | `S101`, `S201`, `S301`, `S401` | `S101`, `S201`, `S301`        |
| **Output Nodes (O)**      | `O501`, `O601`, `O701`, `O801` | `O401`, `O501`                |
| **Destination Nodes (D)** | `D501`, `D601`, `D701`, `D801` | `D401`, `D501`                |
| **Endpoint Map**          | `/ENDPOINTS/DEVICEMAP/X1..X8`  | `/ENDPOINTS/DEVICEMAP/X1..X5` |
| **XP Methods**            | `switch`, `switchAll`          | `switch`                      |

## Key Findings

### 1. Port Identification and Range
The physical device has a wider range of ports and different mapping for outputs.
- **Physical Device**: Inputs `I101-I401`, Outputs `O501-O801`.
- **Emulator**: Inputs `I101-I301`, Outputs `O401-O501`.

### 2. Management Structure
The physical device has a full `/MANAGEMENT` structure which is completely missing in the emulator.
- **Missing Nodes**: `/MANAGEMENT/DEVICE`, `/MANAGEMENT/UID`, `/MANAGEMENT/NETWORKINTERFACES`, etc.
- **Missing Properties**: `ManufacturerName`, `PartNumber`, etc. are only available at root in the emulator, whereas the real device has many more in sub-nodes.

### 3. Media Video Node Properties
Real device nodes have significantly more properties for status and configuration.
- **Physical Input (I101)**: Has `SignalPresent`, `SignalType`, `UiIcon`, `HpdMode`, and sub-nodes `/COLOR`, `/TIMING`, `/HDCP`.
- **Emulator Input**: Only has `Connected`.
- **Physical Output (O501)**: Has `SignalPresent`, `SignalType`, `Output5VMode`, `OutputTmdsMode`, and sub-nodes `/COLOR`, `/TIMING`, `/SCALING`, `/HDCP`, `/SCREEN`.
- **Emulator Output**: Only has `Connected`.

### 4. Cross-Point (XP) Structure
- **Physical Device**: `/MEDIA/VIDEO/XP` contains sources (`S101-S401`) and destinations (`D501-D801`) as sub-nodes, and supports `switchAll`.
- **Emulator**: `/MEDIA/VIDEO/XP` only contains destinations as sub-nodes, and only supports `switch`.

### 5. Endpoint Map (DEVICEMAP)
- **Physical Device**: `/ENDPOINTS/DEVICEMAP` has properties like `DeviceCount`, `AutoAddEnabled`, and methods like `addDevice`, `swap`, `removeDevice`.
- **Emulator**: Only contains the `X1-X5` sub-nodes, no properties or methods on the parent node.

## Conclusion
The emulator needs significant structural updates to match the real GVN MMU, specifically:
1. Adding the `/MANAGEMENT` node structure.
2. Expanding `/MEDIA/VIDEO` port properties (especially `SignalPresent`).
3. Correcting port ranges and `XP` method support.
4. Enhancing `/ENDPOINTS/DEVICEMAP` with its standard methods and properties.
