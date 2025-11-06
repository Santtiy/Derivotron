import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function IntegrationRegionSelector({ setRegionLimits }: { setRegionLimits: (limits: any) => void }) {
  const [regionType, setRegionType] = useState("rectangular"); // Región seleccionada

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, axis: string) => {
    const value = parseFloat(e.target.value);
    setRegionLimits((prevState: any) => ({
      ...prevState,
      [regionType]: { ...prevState[regionType], [axis]: value },
    }));
  };

  return (
    <Tabs defaultValue="rectangular" onValueChange={setRegionType}>
      <TabsList className="grid grid-cols-4">
        <TabsTrigger value="rectangular">Rectangular</TabsTrigger>
        <TabsTrigger value="typeI">Tipo I</TabsTrigger>
        <TabsTrigger value="typeII">Tipo II</TabsTrigger>
        <TabsTrigger value="polar">Polares</TabsTrigger>
      </TabsList>

      <TabsContent value="rectangular">
        <h2>Rectangular</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="xMin">x mín</Label>
            <Input id="xMin" type="number" step="0.1" onChange={(e) => handleInputChange(e, "xMin")} />
          </div>
          <div>
            <Label htmlFor="xMax">x máx</Label>
            <Input id="xMax" type="number" step="0.1" onChange={(e) => handleInputChange(e, "xMax")} />
          </div>
          <div>
            <Label htmlFor="yMin">y mín</Label>
            <Input id="yMin" type="number" step="0.1" onChange={(e) => handleInputChange(e, "yMin")} />
          </div>
          <div>
            <Label htmlFor="yMax">y máx</Label>
            <Input id="yMax" type="number" step="0.1" onChange={(e) => handleInputChange(e, "yMax")} />
          </div>
        </div>
      </TabsContent>

      {/* Add similar TabsContent for 'typeI', 'typeII' and 'polar' */}
    </Tabs>
  );
}
