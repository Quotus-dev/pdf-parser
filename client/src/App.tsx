import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Loader2Icon } from "lucide-react";
import ReactJson from "react-json-view";
import axios from "axios";

// import { useState } from 'react'
function App() {
  const [file, setFile] = useState<File>();
  const [loading, setLoading] = useState<boolean>(false);
  const [clauses, setClauses] = useState<any>({});
  const [tables, setTables] = useState<any>({});
  const [err, setErr] = useState("");

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files![0]);
  }

  async function handleSubmit() {
    const fd = new FormData();

    if (!file) {
      setErr("Please select a file before trying ...");
      console.log(err);
      return;
    }

    fd.append("file", file);

    const res = await axios.post("http://localhost:5050/api/v1/upload", fd, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // console.log(res.data?.data?.path);

    try {
      setLoading(true);
      const data = await axios.post("http://localhost:5050/api/v1/pdf", {
        fileUrl: res.data?.data?.path,
      });
      setLoading(false);
      setClauses(data.data?.data?.clauses);
      setTables(data.data?.data?.tables);
    } catch (err) {
      setErr("Something went wrong, please try again later");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid w-screen h-screen place-content-center items-center gap-4">
        <div className="items-center gap-1.5">
          <Label htmlFor="doc">Upload Your Document</Label>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              id="doc"
              type="file"
              onChange={handleFileChange}
              accept="application/pdf"
            />
            <Button type="submit" onClick={handleSubmit}>
              Upload
            </Button>
          </div>
        </div>
        {err && <h1>{err}</h1>}
        {loading && (
          <div className="grid border-2 min-h-[250px] rounded-md border-border place-content-center items-center gap-1.5">
            <Loader2Icon height={20} width={20} className="animate-spin" />
          </div>
        )}
        <div className="flex items-center gap-4 justify-center">
          {Object.keys(clauses).length ? (
            <div className="grid border-2 min-h-[250px] rounded-md border-border place-content-center overflow-auto items-center gap-1.5">
              <ReactJson
                src={clauses}
                style={{
                  height: "500px",
                  width: "500px",
                }}
              />
            </div>
          ) : null}
          {Object.keys(tables).length ? <Table data={tables.data} /> : null}
        </div>
      </div>
    </>
  );
}

function Table({ data }: { data: unknown }) {
  // console.log({data})

  const pageNumbers = useMemo(
    () => Object.keys(data)?.map((pageKey) => data[pageKey]?.page),
    [data]
  );

  const [page, setPage] = useState<number | undefined>();
  const [pageData, setPageData] = useState([]);

  useEffect(() => {
    setPage(pageNumbers[0]);
  }, [pageNumbers]);

  function handlePageChange(selectedPage: number) {
    setPage(selectedPage);
  }

  useEffect(() => {
    console.log("Runnning ...", page);
    const d = Object.values(data).filter((d) => d?.page === page);
    setPageData(d);
  }, [data, page]);

  return (
    <div className="min-h-[500px] max-h-[500px] max-w-[500px] grid border-2 rounded-md border-border overflow-auto">
      <div className="mb-4 flex justify-center mt-2">
        <Select
          onValueChange={handlePageChange}
          className=""
          value={page} // Use value prop to control the selected page
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {pageNumbers?.map((pageNumber) => (
              <SelectItem key={pageNumber} value={pageNumber}>
                Page {pageNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {page &&
        pageData?.map((data) => <TableElement key={data?.page} data={data} />)}
    </div>
  );
}

function TableElement({ data }) {
  if (!data || !data.tables || data.tables.length === 0) {
    return null; // Handle empty or missing data
  }

  const columnHeaders = useMemo(() => data.tables[0], [data.tables]);
  const tableData = useMemo(() => {
    const newData = [...data.tables];
    newData.shift();
    return newData;
  }, [data.tables]);

  // console.log(columnHeaders);

  return (
    <div className="overflow-x-auto overflow-y-auto">
      <table className="table-auto min-w-full">
        <thead>
          <tr>
            {columnHeaders?.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData?.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row?.map((cell, cellIndex) => (
                <td
                  className="min-w-[250px] text-sm border-b-2 border-border text-center py-4"
                  key={cellIndex}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
