<%@ LANGUAGE="VBSCRIPT" CODEPAGE="65001" %>
<!--#include file="dist/asp/inc_config.asp" -->
<%' use this meta tag instead of adovbs.inc%>
<!--METADATA TYPE="typelib" uuid="00000205-0000-0010-8000-00AA006D2EA4" -->
<%
Response.CodePage = 65001
Session.CodePage = 65001
Response.CharSet = "UTF-8"

' Local Constants
'=======================
Const constPageScriptName = "view.asp"
Dim strPageTitle, nNavID, strPageURL
strPageTitle = ""
strPageURL = "404.asp"
nNavID = Request("NavID")
IF NOT IsNumeric(nNavID) THEN nNavID = ""

' Open DB Connection
'=======================
adoConn.Open
    
IF nNavID <> "" THEN
    strSQL = "SELECT * FROM portal.Navigation WHERE NavId = " & nNavID
    SET rsItems = Server.CreateObject("ADODB.Recordset")
    rsItems.Open strSQL, adoConn

    IF NOT rsItems.EOF THEN
        IF IsNumeric(rsItems("ViewID")) THEN
            strPageURL = "dataview.asp?ViewID=" & rsItems("ViewID")
        ELSE
            strPageURL = rsItems("NavUri")
        END IF

        strPageTitle = rsItems("NavLabel")
    END IF

    rsItems.Close
    SET rsItems = Nothing

END IF
%>
<!DOCTYPE html>
<!--
This is a starter template page. Use this page to start your new project from
scratch. This page gets rid of all links and provides the needed markup only.
-->
<html>
<head>
  <title><%= constPortalTitle %></title>
<!--#include file="dist/asp/inc_meta.asp" -->
</head>
<body class="<%= globalBodyClass %>">
<div class="wrapper">
<!--#include file="dist/asp/inc_header.asp" -->

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1><%= strPageTitle %></h1>

      <ol class="breadcrumb">
        <li><a href="default.asp"><i class="fas fa-tachometer-alt"></i> Home</a></li>
        <li class="active"><%= strPageTitle %></li>
      </ol>

    </section>

    <!-- Main content -->
    <section class="content container-fluid">
        <iframe width="100%" style="height: auto; margin: 10px auto 0px auto; min-height: 400px; overflow: auto" scrolling="yes" src="<%= strPageURL %>"></iframe>
    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->

<!--#include file="dist/asp/inc_footer.asp" -->
</div>
<!-- ./wrapper -->

<!-- REQUIRED JS SCRIPTS -->
<!--#include file="dist/asp/inc_footer_jscripts.asp" -->

<!-- AdminLTE App -->
<script src="dist/js/adminlte.min.js"></script>

<!-- Optionally, you can add Slimscroll and FastClick plugins.
     Both of these plugins are recommended to enhance the
     user experience. -->
</body>
</html>